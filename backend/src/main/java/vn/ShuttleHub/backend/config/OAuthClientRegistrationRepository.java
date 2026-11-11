package vn.ShuttleHub.backend.config;

import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

/**
 * Repository OAuth tự quản lý — chỉ chứa provider đang được BẬT.
 *
 * ⚠️ Vì sao không dùng `InMemoryClientRegistrationRepository`?
 *   Lớp đó ném `IllegalArgumentException: registrations cannot be empty` khi
 *   danh sách rỗng. Mà ta CẦN app vẫn khởi động được khi user chưa đăng ký
 *   Google/Meta (chưa có credential) → danh sách rỗng là trường hợp hợp lệ.
 *
 * ⚠️ Spring Security 7: interface `ClientRegistrationRepository` chỉ có
 * `findByRegistrationId` (không còn `findAll`). Ta implement thêm `Iterable`
 * để controller liệt kê được provider đang bật.
 */
public class OAuthClientRegistrationRepository implements ClientRegistrationRepository, Iterable<ClientRegistration> {

    private final List<ClientRegistration> registrations;

    public OAuthClientRegistrationRepository(List<ClientRegistration> registrations) {
        this.registrations = Collections.unmodifiableList(new ArrayList<>(registrations));
    }

    @Override
    public ClientRegistration findByRegistrationId(String registrationId) {
        return this.registrations.stream()
                .filter(r -> r.getRegistrationId().equals(registrationId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown provider ID '" + registrationId + "'"));
    }

    @Override
    public Iterator<ClientRegistration> iterator() {
        return this.registrations.iterator();
    }

    /** Danh sách provider đang bật. */
    public List<ClientRegistration> getRegistrations() {
        return this.registrations;
    }
}
