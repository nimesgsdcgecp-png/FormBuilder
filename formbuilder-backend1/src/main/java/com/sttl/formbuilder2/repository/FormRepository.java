package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.enums.FormStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FormRepository — Data Access Layer for the {@link Form} entity
 *
 * What it does:
 * Extends Spring Data JPA's {@code JpaRepository}, which provides
 * out-of-the-box
 * CRUD operations (save, findById, findAll, delete, etc.) for the {@code forms}
 * table — no SQL boilerplate required.
 *
 * Custom queries:
 * Spring Data JPA auto-generates these from the method name using its
 * "query derivation" mechanism:
 *
 * - {@link #findByStatusNotOrderByUpdatedAtDesc} — fetches all non-archived
 * forms
 * for the dashboard, sorted newest-first.
 * - {@link #findByPublicShareToken} — resolves a UUID share token (from the
 * public /f/{token} URL) to the matching Form, used by the public form page and
 * public submission endpoint.
 *
 * Application flow:
 * FormController → FormService / SubmissionService → FormRepository →
 * PostgreSQL
 */
@Repository
public interface FormRepository extends JpaRepository<Form, Long> {

    /**
     * Returns all forms whose status is NOT the given value, ordered by most
     * recently updated. Used by the dashboard to exclude ARCHIVED forms.
     */
    List<Form> findAllByStatusNotOrderByUpdatedAtDesc(FormStatus status);

    List<Form> findByStatusOrderByUpdatedAtDesc(FormStatus status);

    // Find all forms for a specific user, excluding a specific status (e.g. ARCHIVED)
    List<Form> findByOwnerAndStatusNotOrderByUpdatedAtDesc(AppUser owner, FormStatus status);

    // Find all forms for a specific user with a specific status (e.g. ARCHIVED)
    List<Form> findByOwnerAndStatusOrderByUpdatedAtDesc(AppUser owner, FormStatus status);

    @Query("SELECT f FROM Form f WHERE (f.owner = :owner OR f.issuedByUsername = :username) AND f.status <> :status ORDER BY f.updatedAt DESC")
    List<Form> findByOwnerOrIssuedByUsernameAndStatusNot(@Param("owner") AppUser owner, @Param("username") String username, @Param("status") FormStatus status);

    @Query("SELECT f FROM Form f WHERE (f.owner = :owner OR f.issuedByUsername = :username) AND f.status = :status ORDER BY f.updatedAt DESC")
    List<Form> findByOwnerOrIssuedByUsernameAndStatus(@Param("owner") AppUser owner, @Param("username") String username, @Param("status") FormStatus status);

    /**
     * Looks up a form by its public share token (a UUID stored in the {@code forms}
     * table). Returns {@code Optional.empty()} if no match is found, which causes
     * the service layer to throw a 404-equivalent error.
     */
    Optional<Form> findByPublicShareToken(String publicShareToken);
}